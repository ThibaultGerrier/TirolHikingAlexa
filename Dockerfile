FROM node:8-alpine

COPY . /var/src
WORKDIR /var/src

# install node dependencies
ENV NPM_CONFIG_LOGLEVEL warn
RUN npm install

ARG TZ
RUN apk add -U tzdata && \
    cp /usr/share/zoneinfo/$TZ /etc/localtime && \
    echo $TZ >  /etc/timezone && \
    date

# Expose website on port
EXPOSE 8008

CMD ["npm", "start"]
