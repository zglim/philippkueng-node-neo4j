test:
	./node_modules/.bin/mocha test/test.unit.js
	./node_modules/.bin/mocha test/test.main.js -b

test-unit:
	./node_modules/.bin/mocha test/test.unit.js

test-integration:
	./node_modules/.bin/mocha test/test.main.js -b

coveralls:
	./node_modules/.bin/istanbul cover \
	./node_modules/mocha/bin/_mocha --report lcovonly -- -R spec -t 10000 && \
		cat ./coverage/lcov.info | ./node_modules/coveralls/bin/coveralls.js --verbose

.PHONY: test test-unit test-integration coveralls
