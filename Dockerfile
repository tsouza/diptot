FROM node:10-slim

RUN mkdir /app
ADD *.json ./app/
ADD src ./app/src/

WORKDIR /app
RUN npm install -g typescript
RUN npm install && \
    npm run prepare && \
    npm install -g

ENTRYPOINT [ "diptot" ]