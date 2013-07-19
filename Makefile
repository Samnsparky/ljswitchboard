all: lint test
	cd src;
	mkdir -p build
	cd src; zip -r ../build/app.zip ./*
	mv ./build/app.zip ./build/app.nw
	cp -r ./switchboard_modules ./build

lint:
	cd src; jshint ./

test:
	nodeunit ./src/*_test.js

clean:
	rm -r ./build