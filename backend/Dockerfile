# 多阶段构建：编译为静态二进制后放入精简镜像
FROM golang:1.22-alpine AS build
WORKDIR /app
RUN apk add --no-cache git
COPY go.mod ./
COPY . .
# 容器内联网解析依赖并生成 go.sum（本地无 Go，故在此完成）
RUN go mod tidy
RUN CGO_ENABLED=0 GOOS=linux go build -o /hive ./cmd/server

FROM alpine:3.20
RUN apk add --no-cache ca-certificates tzdata
COPY --from=build /hive /hive
EXPOSE 8080
ENTRYPOINT ["/hive"]
