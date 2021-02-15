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

test:
	npm test

test-coverage:
	npm test -- --coverage

debug:
	DEBUG=page-loader npx page-loader https://nodejs.org/en/

debug-test:
	DEBUG=nock.scope:* make test
