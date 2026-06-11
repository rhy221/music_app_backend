FROM devopsfaith/krakend:2.7
COPY krakend.json /etc/krakend/krakend.json
COPY jwk.json /etc/krakend/jwk.json
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
CMD ["run", "-c", "/etc/krakend/krakend.json"]
