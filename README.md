# enduro-todo

This is a version of the
[todoFRP](https://github.com/lynaghk/todoFRP/tree/master/todo/flapjax-js)
application that persists data to the server.

It can be deployed easily and freely to [Heroku](http://www.heroku.com/).

[Flapjax](http://www.flapjax-lang.org/) is used in the browser for
FRP, and [enduro](https://github.com/alandipert/enduro) is used on the
server for persistence.

For a live demo, see
[http://enduro-todos.herokuapp.com/](http://enduro-todos.herokuapp.com/).

## Usage

### Deployment to Heroku

See [Building a Database-Backed Clojure Web
Application](https://devcenter.heroku.com/articles/clojure-web-application)
for instructions on installing and configuring the Heroku tools and
deploying database-backed Clojure applications.

Then, deploy this application as per the article's
[Deploy](https://devcenter.heroku.com/articles/clojure-web-application#deploy)
instructions.

### Local Development

If you are running PostgreSQL locally, you may run the application on
your machine with
[Leiningen](https://github.com/technomancy/leiningen) using a command
like:

    DATABASE_URL="postgresql://localhost:5432/your-db" lein ring server

Replace `your-db` with the name of your PostgreSQL database.

For development without PostgreSQL, you may consider using an enduro
`mem-atom` or `file-atom` instead of a `postgresql-atom` in
`enduro_todo.clj`.

## License

Copyright (C) 2013 [Alan Dipert](http://alan.dipert.org/)

Distributed under the Eclipse Public License, the same as Clojure.