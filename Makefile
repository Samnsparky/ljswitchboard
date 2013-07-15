all: lint test
	cd src;
	mkdir -p build
	cd src; zip -r ../build/app.zip ./*
	mv ./build/app.zip ./build/app.nw

lint:
	jshint ./src/*.js;

test:
	nodeunit ./src/*_test.js

clean:
	rm -r ./build