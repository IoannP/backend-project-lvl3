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
	DEBUG=axios,page-loader npx page-loader https://ru.hexlet.io/my

debug-test:
	DEBUG=nock.scope:* make test
