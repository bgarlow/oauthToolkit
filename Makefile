
setup:
	npm install http

build:
	echo "nothing to build, this Node, but thank you for thinking of me"

run:
	npm start

dockertest:
	make setup
	make build
	make run


