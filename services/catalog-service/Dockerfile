FROM eclipse-temurin:26-jdk AS build

WORKDIR /workspace

COPY gradlew gradlew.bat ./
COPY gradle/ gradle/
RUN chmod +x gradlew && ./gradlew --version

COPY settings.gradle build.gradle.kts* ./
COPY libs/java-common/ libs/java-common/
COPY libs/events/java/music-events/ libs/events/java/music-events/
COPY libs/api-clients/java/ libs/api-clients/java/

COPY services/catalog-service/ services/catalog-service/

RUN --mount=type=cache,id=gradle,target=/root/.gradle \
    mkdir -p services/user-service services/playlist-service services/library-service && \
    ./gradlew :services:catalog-service:bootJar -x test --no-daemon

FROM eclipse-temurin:26-jre

WORKDIR /app

ADD https://github.com/open-telemetry/opentelemetry-java-instrumentation/releases/latest/download/opentelemetry-javaagent.jar /app/opentelemetry-javaagent.jar

COPY --from=build /workspace/services/catalog-service/build/libs/*.jar app.jar

EXPOSE 8082

ENTRYPOINT ["java", "-javaagent:/app/opentelemetry-javaagent.jar", "-jar", "app.jar"]
