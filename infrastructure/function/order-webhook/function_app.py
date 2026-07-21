import azure.functions as func

from handler import _parse_body, dispatch


app = func.FunctionApp(http_auth_level=func.AuthLevel.ANONYMOUS)


@app.route(route="status", methods=["GET"])
def status(req: func.HttpRequest) -> func.HttpResponse:
    result = dispatch("GET", "/status", {})
    return func.HttpResponse(result["body"], status_code=result["statusCode"], mimetype="application/json")


@app.route(route="checkout", methods=["POST"])
def checkout(req: func.HttpRequest) -> func.HttpResponse:
    body = _parse_body(req.get_body().decode("utf-8") if req.get_body() else "")
    result = dispatch("POST", "/checkout", body)
    return func.HttpResponse(result["body"], status_code=result["statusCode"], mimetype="application/json")


@app.route(route="demo/eicar", methods=["GET"])
def eicar(req: func.HttpRequest) -> func.HttpResponse:
    result = dispatch("GET", "/demo/eicar", {})
    return func.HttpResponse(result["body"], status_code=result["statusCode"], mimetype="application/json")


@app.route(route="demo/yaml", methods=["POST"])
def yaml_demo(req: func.HttpRequest) -> func.HttpResponse:
    body = _parse_body(req.get_body().decode("utf-8") if req.get_body() else "")
    result = dispatch("POST", "/demo/yaml", body)
    return func.HttpResponse(result["body"], status_code=result["statusCode"], mimetype="application/json")


@app.route(route="fulfillment/carrier-check", methods=["POST"])
def fulfillment_carrier_check(req: func.HttpRequest) -> func.HttpResponse:
    """Azure Function fulfillment — carrier CLI / shell probe."""
    body = _parse_body(req.get_body().decode("utf-8") if req.get_body() else "")
    result = dispatch("POST", "/fulfillment/carrier-check", body)
    return func.HttpResponse(result["body"], status_code=result["statusCode"], mimetype="application/json")


@app.route(route="fulfillment/av-sample", methods=["POST"])
def fulfillment_av_sample(req: func.HttpRequest) -> func.HttpResponse:
    """Azure Function fulfillment — AV test sample attach (EICAR file write)."""
    body = _parse_body(req.get_body().decode("utf-8") if req.get_body() else "")
    result = dispatch("POST", "/fulfillment/av-sample", body)
    return func.HttpResponse(result["body"], status_code=result["statusCode"], mimetype="application/json")
