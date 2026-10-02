def test_register_and_login(client):
    # Register
    res = client.post("/api/auth/register", json={
        "email": "jane@example.com",
        "password": "securepassword",
        "full_name": "Jane Doe"
    })
    assert res.status_code == 200, res.text
    data = res.json()
    assert "access_token" in data
    assert data["user"]["email"] == "jane@example.com"
    assert data["user"]["full_name"] == "Jane Doe"
    assert data["user"]["is_verified"] is False

    # Prevent duplicate registration
    res_dup = client.post("/api/auth/register", json={
        "email": "jane@example.com",
        "password": "anotherpassword"
    })
    assert res_dup.status_code == 400

    # Login
    res_login = client.post("/api/auth/login", json={
        "email": "jane@example.com",
        "password": "securepassword"
    })
    assert res_login.status_code == 200
    token = res_login.json()["access_token"]

    # Verify /me endpoint
    headers = {"Authorization": f"Bearer {token}"}
    res_me = client.get("/api/auth/me", headers=headers)
    assert res_me.status_code == 200
    assert res_me.json()["email"] == "jane@example.com"

def test_email_verification_flow(client):
    res = client.post("/api/auth/register", json={
        "email": "verify_me@example.com",
        "password": "mypassword"
    })
    assert res.status_code == 200
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Resend verification to get a simulated token
    res_resend = client.post("/api/auth/resend-verification", headers=headers)
    assert res_resend.status_code == 200
    sim_token = res_resend.json().get("simulation_token")
    assert sim_token is not None

    # Verify email
    res_verify = client.post("/api/auth/verify-email", json={"token": sim_token})
    assert res_verify.status_code == 200

    # Check /me is verified
    res_me = client.get("/api/auth/me", headers=headers)
    assert res_me.json()["is_verified"] is True

def test_password_reset_flow(client):
    client.post("/api/auth/register", json={
        "email": "reset_me@example.com",
        "password": "oldpassword123"
    })

    # Request reset
    res_req = client.post("/api/auth/forgot-password", json={"email": "reset_me@example.com"})
    assert res_req.status_code == 200
    sim_token = res_req.json().get("simulation_token")
    assert sim_token is not None

    # Confirm reset
    res_confirm = client.post("/api/auth/reset-password", json={
        "token": sim_token,
        "new_password": "brandnewpassword456"
    })
    assert res_confirm.status_code == 200

    # Old password should now fail
    res_fail = client.post("/api/auth/login", json={
        "email": "reset_me@example.com",
        "password": "oldpassword123"
    })
    assert res_fail.status_code == 401

    # New password should succeed
    res_succ = client.post("/api/auth/login", json={
        "email": "reset_me@example.com",
        "password": "brandnewpassword456"
    })
    assert res_succ.status_code == 200
