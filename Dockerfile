FROM bun:latest-alpine
WORKDIR /app
COPY . .
RUN bun install
VOLUME ["/app/store", "/app/uploads"]
RUN touch ./store/vectors.db
EXPOSE 3000
CMD ["bun", "run", "start"]
