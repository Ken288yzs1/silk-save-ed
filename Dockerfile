FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html style.css script.js crypto.js /usr/share/nginx/html/

# 解决 HF 非 root 用户权限问题
RUN chmod -R 777 /var/cache/nginx /var/run /var/log/nginx /etc/nginx \
    && touch /var/run/nginx.pid \
    && chmod 777 /var/run/nginx.pid

EXPOSE 7860

CMD ["nginx", "-g", "daemon off;"]
