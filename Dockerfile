# Cloud Run: servicio alvarogt-casa (GO + Viajes con sesión).
FROM golang:1.24-bookworm AS build
WORKDIR /src
COPY go/server/go.mod go/server/go.sum ./
RUN go mod download
COPY go/server/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/server .

FROM gcr.io/distroless/static-debian12
WORKDIR /app
COPY --from=build /out/server /app/server
COPY go/index.html go/condiciones.json /app/static/go/
COPY viajes/index.html /app/static/viajes/
ENV GO_SITE_ROOT=/app/static
ENV GO_SECURE_COOKIE=1
ENV FIREBASE_PROJECT_ID=tablongo
ENV PORT=8080
EXPOSE 8080
USER nonroot:nonroot
ENTRYPOINT ["/app/server"]
