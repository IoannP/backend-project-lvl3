install:
	npm install

prepublish: 
	npm publish --dry-run

publish:
	npm publish

link:
	npm link

lint:
	npx eslint .

prettier:
	npx prettier --write .

test:
	npm test

test-coverage:
	npm test -- --coverage
