FROM maven:3.9.15-eclipse-temurin-21-alpine AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -q
COPY src ./src
RUN mvn package -DskipTests -q

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=build /app/target/*.jar app.jar

# Zelfverklaring (onderdeel 1): zelfde waarden als info.contracts.* op
# /actuator/info. Waarden komen van buitenaf via --build-arg (ci/docker-build.sh
# leest ze uit pom.xml) — nooit hardcoded, geen duplicatie.
ARG CONTRACTS_SERVES=""
ARG CONTRACTS_CONSUMES=""
LABEL nl.showcase.contracts.serves="${CONTRACTS_SERVES}"
LABEL nl.showcase.contracts.consumes="${CONTRACTS_CONSUMES}"

EXPOSE 8082
USER appuser
ENTRYPOINT ["java", "-jar", "app.jar"]
