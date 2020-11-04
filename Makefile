install:
	npm install

prepublish: 
	npm publish --dry-run

publish:
	npm publish

lint:
	npx eslint .

test:
	npm test

test-coverage:
	npm test -- --coverage
