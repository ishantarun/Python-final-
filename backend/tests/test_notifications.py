def test_notification_preferences_and_in_app(client, auth_headers):
    # 1. Get default preferences
    res_pref = client.get("/api/notifications/preferences", headers=auth_headers)
    assert res_pref.status_code == 200
    pref = res_pref.json()
    assert pref["in_app_enabled"] is True
    assert pref["email_reminders_enabled"] is False

    # 2. Update preferences
    res_up = client.put("/api/notifications/preferences", json={
        "email_reminders_enabled": True,
        "reminder_timing": "10_mins_before"
    }, headers=auth_headers)
    assert res_up.status_code == 200
    updated_pref = res_up.json()
    assert updated_pref["email_reminders_enabled"] is True
    assert updated_pref["reminder_timing"] == "10_mins_before"

    # 3. SMTP Status check
    res_smtp = client.get("/api/notifications/smtp-status", headers=auth_headers)
    assert res_smtp.status_code == 200
    status_data = res_smtp.json()
    assert "is_configured" in status_data
    assert "status_message" in status_data

    # 4. In-App Notifications check
    res_notifs = client.get("/api/notifications", headers=auth_headers)
    assert res_notifs.status_code == 200
    assert isinstance(res_notifs.json(), list)

    # 5. Trigger reminders check endpoint
    res_trigger = client.post("/api/notifications/trigger-reminders", headers=auth_headers)
    assert res_trigger.status_code == 200
