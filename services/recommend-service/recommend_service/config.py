from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    neo4j_uri: str = "bolt://localhost:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = "music_pass"
    redis_url: str = "redis://:music_pass@localhost:6379/0"
    rabbitmq_url: str = "amqp://music_admin:music_pass@localhost:5672/music"
    port: int = 8000
    cold_start_threshold: int = 10
    rec_cache_ttl: int = 1800
    discover_cache_ttl: int = 604800

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )
