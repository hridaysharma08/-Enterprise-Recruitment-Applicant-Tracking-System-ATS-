# ---------- 1. Build the React frontend ----------
FROM node:20-alpine AS frontend
WORKDIR /fe
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

# ---------- 2. Build the Spring Boot backend (with the frontend bundled in) ----------
FROM maven:3.9-eclipse-temurin-21 AS backend
WORKDIR /be
COPY backend/pom.xml .
RUN mvn -B -q dependency:go-offline
COPY backend/src ./src
COPY --from=frontend /fe/dist ./src/main/resources/static
RUN mvn -B -q -DskipTests package

# ---------- 3. Runtime image ----------
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=backend /be/target/ats-backend-1.0.0.jar app.jar
# Tuned for small (512 MB) free-tier containers
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75 -XX:+UseSerialGC -Xss512k"
EXPOSE 8080
CMD ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
