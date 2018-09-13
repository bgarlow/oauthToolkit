
setup:
	npm install 
	npm install -g @angular/cli

build:
	ng build

run:
	node server.js
	npm start

dockertest:
	make setup
	make build
	make run


