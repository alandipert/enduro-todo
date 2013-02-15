(defproject alandipert/enduro-todo "1.0.0"
  :description "todoFRP with persistence persistence."
  :min-lein-version "2.0.0"
  :dependencies [[org.clojure/clojure "1.4.0"]
                 [org.clojure/data.json "0.2.0"]
                 [ring/ring-core "1.1.6"]
                 [ring/ring-jetty-adapter "1.1.6"]
                 [compojure "1.1.3"]
                 [alandipert/enduro "1.1.0"]]
  :plugins [[lein-ring "0.8.2"]]
  :ring {:handler alandipert.enduro-todo/app})
