from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.database import get_db
from backend.app.models import Category, Task, User
from backend.app.schemas import CategoryCreate, CategoryUpdate, CategoryResponse, MessageResponse
from backend.app.auth import get_current_user

router = APIRouter(prefix="/api/categories", tags=["Categories"])

@router.get("", response_model=List[CategoryResponse])
def get_user_categories(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve all categories belonging to the current user with task counts."""
    categories = db.query(Category).filter(Category.user_id == current_user.id).order_by(Category.id.asc()).all()
    
    # Calculate task counts
    result = []
    for cat in categories:
        count = db.query(func.count(Task.id)).filter(
            Task.category_id == cat.id,
            Task.user_id == current_user.id,
            Task.is_completed == False
        ).scalar() or 0

        res_cat = CategoryResponse(
            id=cat.id,
            user_id=cat.user_id,
            name=cat.name,
            color=cat.color,
            icon=cat.icon,
            is_default=cat.is_default,
            task_count=count
        )
        result.append(res_cat)
    return result

@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    category_in: CategoryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new custom category for the current user."""
    # Check duplicate category name
    existing = db.query(Category).filter(
        Category.user_id == current_user.id,
        func.lower(Category.name) == category_in.name.lower().strip()
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A category named '{category_in.name}' already exists."
        )

    cat = Category(
        user_id=current_user.id,
        name=category_in.name.strip(),
        color=category_in.color or "#4F46E5",
        icon=category_in.icon or "tag",
        is_default=False
    )
    db.add(cat)
    db.commit()
    db.refresh(cat)

    return CategoryResponse(
        id=cat.id,
        user_id=cat.user_id,
        name=cat.name,
        color=cat.color,
        icon=cat.icon,
        is_default=cat.is_default,
        task_count=0
    )

@router.put("/{category_id}", response_model=CategoryResponse)
def update_category(
    category_id: int,
    category_in: CategoryUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a custom or default category."""
    cat = db.query(Category).filter(Category.id == category_id, Category.user_id == current_user.id).first()
    if not cat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found.")

    if category_in.name:
        existing = db.query(Category).filter(
            Category.user_id == current_user.id,
            Category.id != category_id,
            func.lower(Category.name) == category_in.name.lower().strip()
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"A category named '{category_in.name}' already exists."
            )
        cat.name = category_in.name.strip()

    if category_in.color is not None:
        cat.color = category_in.color
    if category_in.icon is not None:
        cat.icon = category_in.icon

    db.commit()
    db.refresh(cat)

    count = db.query(func.count(Task.id)).filter(
        Task.category_id == cat.id,
        Task.user_id == current_user.id,
        Task.is_completed == False
    ).scalar() or 0

    return CategoryResponse(
        id=cat.id,
        user_id=cat.user_id,
        name=cat.name,
        color=cat.color,
        icon=cat.icon,
        is_default=cat.is_default,
        task_count=count
    )

@router.delete("/{category_id}", response_model=MessageResponse)
def delete_category(
    category_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a category. Associated tasks will have category set to null."""
    cat = db.query(Category).filter(Category.id == category_id, Category.user_id == current_user.id).first()
    if not cat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found.")

    # Reassign tasks to null
    db.query(Task).filter(Task.category_id == category_id, Task.user_id == current_user.id).update(
        {Task.category_id: None}
    )
    db.delete(cat)
    db.commit()

    return MessageResponse(message=f"Category '{cat.name}' deleted successfully.")
