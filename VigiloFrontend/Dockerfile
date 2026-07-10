FROM node:24


WORKDIR /app


COPY package*.json ./


RUN npm install


COPY . .


EXPOSE 4202


CMD ["npm","start","--","--host","0.0.0.0","--port","4202"]