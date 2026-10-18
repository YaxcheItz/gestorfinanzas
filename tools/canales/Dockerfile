FROM python:3.13-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 KAPTAL_DATA_DIR=/data PORT=10000
WORKDIR /app
RUN groupadd --gid 10001 kaptal && useradd --uid 10001 --gid 10001 --no-create-home kaptal \
    && mkdir /data && chown kaptal:kaptal /data
COPY --chown=kaptal:kaptal canales.py whatsapp_setup.py whatsapp_host.py ./
USER kaptal
EXPOSE 10000
CMD ["python", "whatsapp_host.py", "serve"]
