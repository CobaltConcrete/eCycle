from unittest.mock import Mock

import pytest
import requests

import routes_service

BODY = {
    "user_location": {"lat": 0, "lon": 0},
    "destination": {"lat": 1.3, "lon": 103.8},
}


@pytest.fixture
def provider(monkeypatch):
    monkeypatch.setenv("GOOGLE_MAPS_API_KEY", "fixture-server-key")
    response = Mock(status_code=200)
    response.json.return_value = {
        "routes": [
            {
                "polyline": {"encodedPolyline": "fixture-polyline"},
                "distanceMeters": 1234,
                "duration": "180.5s",
                "warnings": ["Use caution"],
                "legs": [
                    {
                        "steps": [
                            {"navigationInstruction": {"instructions": "Turn left"}}
                        ]
                    }
                ],
            }
        ]
    }
    post = Mock(return_value=response)
    monkeypatch.setattr(routes_service.requests, "post", post)
    return post, response


@pytest.mark.parametrize(
    "mode,expected",
    [
        ("DRIVING", "DRIVE"),
        ("walking", "WALK"),
        ("BICYCLING", "BICYCLE"),
        ("TRANSIT", "TRANSIT"),
    ],
)
def test_route_contract_mode_mapping_and_key_boundary(app, provider, mode, expected):
    post, _ = provider
    result = app.post("/get-directions", json={**BODY, "mode": mode})
    assert result.status_code == 200
    assert result.json()["directions"] == ["Turn left"]
    assert result.json()["warnings"] == ["Use caution"]
    assert result.json()["encodedPolyline"] == "fixture-polyline"
    assert "fixture-server-key" not in result.text
    assert post.call_args.args == (routes_service.ROUTES_URL,)
    kwargs = post.call_args.kwargs
    assert kwargs["json"]["travelMode"] == expected
    assert kwargs["json"]["origin"]["location"]["latLng"] == {
        "latitude": 0,
        "longitude": 0,
    }
    assert "routingPreference" not in kwargs["json"]
    if expected == "TRANSIT":
        assert kwargs["json"]["transitPreferences"] == {"allowedTravelModes": ["RAIL"]}
    else:
        assert "transitPreferences" not in kwargs["json"]
    assert kwargs["headers"]["X-Goog-Api-Key"] == "fixture-server-key"
    assert "*" not in kwargs["headers"]["X-Goog-FieldMask"]
    assert kwargs["allow_redirects"] is False
    assert kwargs["timeout"] == (3, 10)


def test_transit_instructions_and_proto_zero_defaults(app, provider):
    provider[1].json.return_value = {
        "routes": [
            {
                "polyline": {"encodedPolyline": "encoded"},
                "legs": [
                    {
                        "steps": [
                            {
                                "transitDetails": {
                                    "transitLine": {"nameShort": "42"},
                                    "stopDetails": {
                                        "departureStop": {"name": "Station A"},
                                        "arrivalStop": {"name": "Station B"},
                                    },
                                }
                            }
                        ]
                    }
                ],
            }
        ]
    }
    result = app.post("/get-directions", json={**BODY, "mode": "TRANSIT"})
    assert result.json()["directions"] == ["Take 42 from Station A to Station B"]
    assert result.json()["distanceMeters"] == 0


@pytest.mark.parametrize("status", [400, 403, 429, 500, 302])
def test_upstream_errors_are_sanitized(app, provider, status):
    provider[1].status_code = status
    provider[1].json.return_value = {"error": {"message": "fixture-secret-key"}}
    result = app.post("/get-directions", json=BODY)
    assert result.status_code == 502
    assert "fixture-secret-key" not in result.text


def test_no_route_and_timeout(app, provider):
    provider[1].json.return_value = {}
    assert app.post("/get-directions", json=BODY).status_code == 404
    provider[0].side_effect = requests.Timeout("sensitive detail")
    result = app.post("/get-directions", json=BODY)
    assert result.status_code == 502
    assert "sensitive" not in result.text


@pytest.mark.parametrize(
    "data",
    [
        None,
        {"routes": "invalid"},
        {"routes": [{}]},
        {"routes": [{"polyline": {"encodedPolyline": ""}}]},
    ],
)
def test_malformed_provider_response(app, provider, data):
    provider[1].json.return_value = data
    assert app.post("/get-directions", json=BODY).status_code == 502


def test_configuration_validation_and_retired_server_location(
    app, provider, monkeypatch
):
    assert app.post("/get-directions", json={**BODY, "mode": "FLY"}).status_code == 422
    assert (
        app.post(
            "/get-directions", json={**BODY, "destination": {"lat": 91, "lon": 0}}
        ).status_code
        == 422
    )
    monkeypatch.delenv("GOOGLE_MAPS_API_KEY")
    assert app.post("/get-directions", json=BODY).status_code == 503
    assert app.post("/get-current-coordinates").status_code == 410
    provider[0].assert_not_called()
