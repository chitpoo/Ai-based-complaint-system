# Build stage: Maven + JDK 17. Nothing from this stage except the jar reaches the final image.
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
# pom.xml first, so the dependency layer is reused when only the source changes.
COPY pom.xml .
RUN mvn -q -B dependency:go-offline
COPY src ./src
# Unit tests run locally before pushing; skipping them keeps the free-tier build short.
RUN mvn -q -B clean package -DskipTests

# Runtime stage: JRE only.
FROM eclipse-temurin:17-jre
WORKDIR /app
RUN useradd --system --no-create-home --shell /usr/sbin/nologin appuser
COPY --from=build /app/target/grievance-management-0.0.1-SNAPSHOT.jar app.jar
USER appuser

# Heap capped so heap + metaspace + threads fit a 512 MB instance (plan.md §8).
ENV JAVA_OPTS="-Xmx350m"
# Documentation only: the app listens on $PORT (server.port=${PORT:8080}), which the host sets.
EXPOSE 8080
# Shell form so $JAVA_OPTS expands; exec makes java PID 1 so it receives the stop signal.
# All configuration and secrets come from environment variables at run time.
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar app.jar"]
