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

RUN ./gradlew :services:playlist-service:bootJar -x test --no-daemon

FROM eclipse-temurin:26-jre

WORKDIR /app

COPY --from=build /workspace/services/playlist-service/build/libs/*.jar app.jar

EXPOSE 8083

ENTRYPOINT ["java", "-jar", "app.jar"]
