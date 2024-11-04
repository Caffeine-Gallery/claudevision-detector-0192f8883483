import ExperimentalCycles "mo:base/ExperimentalCycles";
import Nat "mo:base/Nat";
import Result "mo:base/Result";

import Text "mo:base/Text";
import Blob "mo:base/Blob";
import Error "mo:base/Error";
import Debug "mo:base/Debug";
import Cycles "mo:base/ExperimentalCycles";
import Array "mo:base/Array";
import Iter "mo:base/Iter";

actor {
    stable var apiKey : Text = "";

    type HttpRequest = {
        url : Text;
        method : Text;
        body : ?Blob;
        headers : [(Text, Text)];
    };

    type HttpResponse = {
        status : Nat;
        headers : [(Text, Text)];
        body : Blob;
    };

    let ic = actor "aaaaa-aa" : actor {
        http_request : HttpRequest -> async HttpResponse;
    };

    public func saveApiKey(key : Text) : async () {
        apiKey := key;
    };

    public query func getApiKey() : async Text {
        apiKey
    };

    public func detectObjects(key : Text, base64Image : Text) : async Text {
        let url = "https://api.anthropic.com/v1/messages";
        let headers = [
            ("Content-Type", "application/json"),
            ("x-api-key", key),
            ("anthropic-version", "2023-06-01")
        ];

        let body = "{\"model\":\"claude-3-5-sonnet-20241022\",\"max_tokens\":8000,\"messages\":[{\"role\":\"user\",\"content\":[{\"type\":\"image\",\"source\":{\"type\":\"base64\",\"media_type\":\"image/jpeg\",\"data\":\"" # base64Image # "\"}}]}],\"system\":\"You are an expert computer vision system. Analyze the provided image and return ONLY a JSON object containing bounding boxes. Follow these strict rules:\\n1. Output MUST be valid JSON with no additional text\\n2. Each detected object must have:\\n   - 'element': descriptive name of the object\\n   - 'bbox': [x1, y1, x2, y2] coordinates (normalized 0-1)\\n   - 'confidence': confidence score (0-1)\\n3. Use this exact format:\\n   {\\n     \\\"detections\\\": [\\n       {\\n         \\\"element\\\": \\\"object_name\\\",\\n         \\\"bbox\\\": [x1, y1, x2, y2],\\n         \\\"confidence\\\": 0.95\\n       }\\n     ]\\n   }\"}";

        Cycles.add(2_000_000_000);
        let response = await ic.http_request({
            url = url;
            method = "POST";
            headers = headers;
            body = ?Text.encodeUtf8(body);
        });

        switch (Text.decodeUtf8(response.body)) {
            case (null) { throw Error.reject("Failed to decode response body") };
            case (?text) {
                let splitResult = Text.split(text, #text "\"content\":");
                let contentArray = Iter.toArray(splitResult);
                if (contentArray.size() > 1) {
                    let contentText = contentArray[1];
                    let trimmedContent = Text.trim(contentText, #text "{");
                    let finalContent = Text.trim(trimmedContent, #text "}");
                    finalContent
                } else {
                    throw Error.reject("Content not found in response");
                };
            };
        };
    };
};
