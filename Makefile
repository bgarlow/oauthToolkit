
setup:
	npm install 
	npm install -g @angular/cli

build:
	echo "nothing to build, this Node, but thank you for thinking of me"

run:
	node server.js
	npm start

dockertest:
	make setup
	make build
	make run


