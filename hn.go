package main

import (
        "fmt"
        "log"
        "net/http"
        "io/ioutil"
        "encoding/json"
        "path"
)

const apiRoot = "https://hacker-news.firebaseio.com/v0/item/"

type Id int

type Item struct {
        By string
        Descendants int
        Id Id
        Kids []Id
        Score int
        Time int
        Title string
        Type string
        Url string
        Text string
}

type Api struct {
}

func (h *Api) FetchItem(id Id) (*Item, error) {
        res, err := http.Get(fmt.Sprintf("%s%d.json", apiRoot, id))
        if err != nil {
                return nil, err
        }

        jsonStr, err := ioutil.ReadAll(res.Body)
        if err != nil {
                return nil, err
        }

        var item *Item
        err = json.Unmarshal(jsonStr, &item)
        if err != nil {
                return nil, err
        }

        return item, nil
}

func (h *Api) WalkItems(startId Id, cb func(*Item)) error {

        item, err := h.FetchItem(startId)
        if err != nil {
                return err
        }

        cb(item)

        for _, kidId := range item.Kids {
                err = h.WalkItems(kidId, cb)
                if err != nil {
                        return err
                }
        }

        return nil
}


func main() {
        api := Api{}

        err := api.WalkItems(24872911, func(item *Item) {

                jsonBytes, err := json.MarshalIndent(item, "", "  ")
                if err != nil {
                        log.Fatal(err)
                }

                fmt.Println(item.Id)

                filename := fmt.Sprintf("%d.json", item.Id)
                outPath := path.Join("items", filename)
                ioutil.WriteFile(outPath, jsonBytes, 0644)
        })

        if err != nil {
                log.Fatal(err)
        }

        //item, err := api.FetchItem(24872911)
        //if err != nil {
        //        log.Fatal(err)
        //}

        //for _, kid := range item.Kids {
        //        fmt.Println(kid)
        //}
}
