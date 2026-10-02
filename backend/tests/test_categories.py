def test_default_and_custom_categories(client, auth_headers):
    # Verify pre-seeded categories (Personal, Work, Study, Health)
    res = client.get("/api/categories", headers=auth_headers)
    assert res.status_code == 200
    cats = res.json()
    names = [c["name"] for c in cats]
    assert "Personal" in names
    assert "Work" in names
    assert "Study" in names
    assert "Health" in names

    # Create custom category
    res_custom = client.post("/api/categories", json={
        "name": "Side Projects",
        "color": "#8B5CF6",
        "icon": "code"
    }, headers=auth_headers)
    assert res_custom.status_code == 201
    custom_data = res_custom.json()
    cat_id = custom_data["id"]
    assert custom_data["name"] == "Side Projects"

    # Update category
    res_up = client.put(f"/api/categories/{cat_id}", json={
        "name": "Side Hustles",
        "color": "#EC4899"
    }, headers=auth_headers)
    assert res_up.status_code == 200
    assert res_up.json()["name"] == "Side Hustles"

    # Delete category
    res_del = client.delete(f"/api/categories/{cat_id}", headers=auth_headers)
    assert res_del.status_code == 200
