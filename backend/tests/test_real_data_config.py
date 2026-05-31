from backend.app.config import Settings


def _base(**overrides):
    values = {"JWT_SECRET_KEY": "x" * 64, "MFA_ENCRYPTION_KEY": "y" * 64}
    values.update(overrides)
    # _env_file=None so the test asserts true code defaults, independent of the
    # developer's local backend/.env (which may set USE_REAL_PRICES, etc.).
    return Settings(_env_file=None, **values)


def test_real_data_flags_have_safe_defaults():
    s = _base()
    assert s.USE_REAL_PRICES is False
    assert s.INTERNAL_API_SECRET == ""


def test_real_data_flags_read_from_env():
    s = _base(USE_REAL_PRICES=True, INTERNAL_API_SECRET="topsecret")
    assert s.USE_REAL_PRICES is True
    assert s.INTERNAL_API_SECRET == "topsecret"
