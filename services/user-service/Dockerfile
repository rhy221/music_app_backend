FROM eclipse-temurin:26-jdk AS build

WORKDIR /workspace

COPY gradlew gradlew.bat ./
COPY gradle/ gradle/
RUN chmod +x gradlew && ./gradlew --version

COPY settings.gradle build.gradle.kts* ./
COPY libs/java-common/ libs/java-common/
COPY libs/events/java/music-events/ libs/events/java/music-events/
COPY libs/api-clients/java/ libs/api-clients/java/

COPY services/user-service/ services/user-service/

RUN --mount=type=cache,id=gradle,target=/root/.gradle \
    mkdir -p services/catalog-service services/playlist-service services/library-service && \
    ./gradlew :services:user-service:bootJar -x test --no-daemon

FROM eclipse-temurin:26-jre

WORKDIR /app

COPY --from=build /workspace/services/user-service/build/libs/*.jar app.jar

EXPOSE 8081

ENTRYPOINT ["java", "-jar", "app.jar"]
