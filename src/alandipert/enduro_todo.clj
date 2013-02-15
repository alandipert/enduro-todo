(ns alandipert.enduro-todo
  (:require [compojure.core     :refer [defroutes context GET POST PUT DELETE]]
            [compojure.route    :refer [resources not-found]]
            [ring.adapter.jetty :refer [run-jetty]]
            [ring.util.response :refer [resource-response]]
            [compojure.handler  :as    handler]
            [clojure.data.json  :as    json]
            [alandipert.enduro  :as    enduro]))

(def db
  (delay
   (enduro/postgresql-atom [] (System/getenv "DATABASE_URL") "enduro_todo")))

(defn json-response [data & [status]]
  {:status (or status 200)
   :headers {"Content-Type" "application/json"}
   :body (json/write-str data)})

(defn wrap-todo [handler]
  #(handler (update-in % [:params :todo] (fnil json/read-str "{}"))))

(defn with-id [todo]
  (assoc todo "id" (str (java.util.UUID/randomUUID))))

(defroutes api-routes
  (POST "/todos" [todo]
        (json-response (enduro/swap! @db conj (with-id todo))))
  (DELETE "/todos" [todo]
          (json-response (enduro/swap! @db #(filterv (partial not= todo) %))))
  (PUT "/todos" [todo]
       (let [update #(if (= (get % "id") (get todo "id")) (merge % todo) %)]
         (json-response (enduro/swap! @db (partial mapv update)))))
  (GET "/todos" [] (json-response @@db)))

(defroutes app-routes
  (GET "/" [] (resource-response "index.html" {:root "public"}))
  (resources "/")
  (context "/apiv1" [] (-> api-routes wrap-todo handler/api))
  (not-found "Not found."))

(def app app-routes)

(defn -main [port]
  (run-jetty app {:port (Integer. port)}))