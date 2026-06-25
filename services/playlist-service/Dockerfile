FROM eclipse-temurin:26-jdk AS build

WORKDIR /workspace

COPY gradlew gradlew.bat ./
COPY gradle/ gradle/
RUN chmod +x gradlew && ./gradlew --version

COPY settings.gradle build.gradle.kts* ./
COPY libs/java-common/ libs/java-common/
COPY libs/events/java/music-events/ libs/events/java/music-events/
COPY libs/api-clients/java/ libs/api-clients/java/

COPY services/playlist-service/ services/playlist-service/

RUN --mount=type=cache,id=gradle,target=/root/.gradle \
    mkdir -p services/user-service services/catalog-service services/library-service && \
    ./gradlew :services:playlist-service:bootJar -x test --no-daemon

FROM eclipse-temurin:26-jre

WORKDIR /app

ADD https://github.com/open-telemetry/opentelemetry-java-instrumentation/releases/latest/download/opentelemetry-javaagent.jar /app/opentelemetry-javaagent.jar

COPY --from=build /workspace/services/playlist-service/build/libs/*.jar app.jar

EXPOSE 8083

ENTRYPOINT ["java", "-javaagent:/app/opentelemetry-javaagent.jar", "-jar", "app.jar"]
