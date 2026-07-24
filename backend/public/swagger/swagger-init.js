window.addEventListener("load", () => {
  window.ui = SwaggerUIBundle({
    url: "/api/docs/openapi.json",
    dom_id: "#swagger-ui",
    deepLinking: true,
    presets: [
      SwaggerUIBundle.presets.apis,
      SwaggerUIStandalonePreset,
    ],
    layout: "StandaloneLayout",
  });
});
