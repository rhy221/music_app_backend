"""Hello unit test module."""

from libs/recommend_api_client.hello import hello


def test_hello():
    """Test the hello function."""
    assert hello() == "Hello libs/recommend-api-client"
