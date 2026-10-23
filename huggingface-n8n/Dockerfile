FROM n8nio/n8n:latest

USER root

# Hugging Face Spaces uses UID 1000 (node user in n8n)
RUN mkdir -p /home/node/.n8n && chown -R node:node /home/node/.n8n

USER node

# Hugging Face Spaces requires web applications to listen on port 7860
ENV N8N_PORT=7860 \
    N8N_LISTEN_ADDRESS=0.0.0.0 \
    N8N_PROTOCOL=https \
    N8N_DEFAULT_BINARY_DATA_MODE=filesystem

EXPOSE 7860

CMD ["n8n", "start"]
