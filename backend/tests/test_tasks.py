from datetime import date, timedelta

def test_task_crud_and_subtasks(client, auth_headers):
    today = date.today().isoformat()
    
    # 1. Create Task
    task_payload = {
        "title": "Finish Mobile App",
        "notes": "Ensure clean styling and solid tests",
        "due_date": today,
        "due_time": "14:30:00",
        "priority": "high",
        "repeat_schedule": "daily",
        "subtasks": ["Implement UI", "Write Pytest Tests"]
    }
    res = client.post("/api/tasks", json=task_payload, headers=auth_headers)
    assert res.status_code == 201, res.text
    task_data = res.json()
    task_id = task_data["id"]
    assert task_data["title"] == "Finish Mobile App"
    assert task_data["priority"] == "high"
    assert len(task_data["subtasks"]) == 2

    # 2. Get Task
    res_get = client.get(f"/api/tasks/{task_id}", headers=auth_headers)
    assert res_get.status_code == 200
    assert res_get.json()["id"] == task_id

    # 3. Toggle Subtask
    subtask_id = task_data["subtasks"][0]["id"]
    res_sub_toggle = client.patch(f"/api/tasks/{task_id}/subtasks/{subtask_id}/toggle", headers=auth_headers)
    assert res_sub_toggle.status_code == 200
    assert res_sub_toggle.json()["is_completed"] is True

    # 4. Toggle Task Complete (recurring daily should spawn next task)
    res_toggle = client.patch(f"/api/tasks/{task_id}/toggle-complete", headers=auth_headers)
    assert res_toggle.status_code == 200
    assert res_toggle.json()["is_completed"] is True

    # Check tasks list has both the completed task and the spawned next occurrence
    res_list = client.get("/api/tasks?filter_by=all", headers=auth_headers)
    assert res_list.status_code == 200
    all_tasks = res_list.json()
    assert len(all_tasks) >= 2

    # 5. Delete Task
    res_del = client.delete(f"/api/tasks/{task_id}", headers=auth_headers)
    assert res_del.status_code == 200

    # 6. Verify Deleted
    res_notfound = client.get(f"/api/tasks/{task_id}", headers=auth_headers)
    assert res_notfound.status_code == 404

def test_task_filtering_and_sorting(client, auth_headers):
    today = date.today()
    tomorrow = today + timedelta(days=1)

    client.post("/api/tasks", json={
        "title": "Task A Today Low",
        "due_date": today.isoformat(),
        "priority": "low"
    }, headers=auth_headers)

    client.post("/api/tasks", json={
        "title": "Task B Tomorrow High",
        "due_date": tomorrow.isoformat(),
        "priority": "high"
    }, headers=auth_headers)

    # Filter Today
    res_today = client.get("/api/tasks?filter_by=today", headers=auth_headers)
    assert res_today.status_code == 200
    items = res_today.json()
    assert any(t["title"] == "Task A Today Low" for t in items)
    assert not any(t["title"] == "Task B Tomorrow High" for t in items)

    # Filter Upcoming
    res_up = client.get("/api/tasks?filter_by=upcoming", headers=auth_headers)
    assert res_up.status_code == 200
    up_items = res_up.json()
    assert any(t["title"] == "Task B Tomorrow High" for t in up_items)

    # Search
    res_search = client.get("/api/tasks?search=Tomorrow", headers=auth_headers)
    assert res_search.status_code == 200
    assert len(res_search.json()) == 1
    assert res_search.json()[0]["title"] == "Task B Tomorrow High"
