FROM node:lts
ENV NODE_CONTAINER_VERSION=1.0.0
# Create directory for application 
WORKDIR /data/bot-app  
# Install dependencies
RUN apt-get update || : && apt-get install python -y
RUN apt-get install ffmpeg -y
 
COPY package*.json ./  
RUN npm install  
COPY . .  
CMD [ "node", "index.js" ]