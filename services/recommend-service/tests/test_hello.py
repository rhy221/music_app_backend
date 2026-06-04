"""Hello unit test module."""

from recommend_service.hello import hello


def test_hello():
    """Test the hello function."""
    assert hello() == "Hello recommend-service"
