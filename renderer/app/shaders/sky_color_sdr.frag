#version 450
#extension GL_GOOGLE_include_directive: require
#include "spectral_functions.glsl"

layout (constant_id = 0) const bool spectral = false;

layout (location = 0) in vec2 inUV;

layout (binding = 2) uniform sampler2D transmittanceImage;
layout (binding = 3) uniform sampler2D multipleScatteringImage;
layout (binding = 4) uniform sampler2D skyviewImage;

layout (push_constant) uniform Constants
{
    vec4 CameraPosition_Fov;
    vec4 CameraForward_AspectRatio;
    float Time;
    bool UseSkyview;
};

vec3 GammaCorrect(vec3 linear_srgb)
{
    vec3 a = 12.92 * linear_srgb;
    vec3 b = 1.055 * pow(linear_srgb, vec3(1.0 / 2.4)) - 0.055;
    vec3 c = step(vec3(0.0031308), linear_srgb);
    return mix(a, b, c);
}

vec3 SimpleToneMap(vec3 color)
{
    const float k = 0.05;
    color = 1.0 - exp(-k * color);
    color = clamp(GammaCorrect(color), 0.0, 1.0);
    return color;
}

layout (location = 0) out vec4 outColor;

vec3 SampleSkyviewLUT(float theta, float phi)
{
    const float elevation = gPI * 0.5 - theta;
    const float u = .5f * (phi + .5f * gPI) / gPI + .5f;
    const float v = 0.5 + 0.5 * sign(elevation) * sqrt(abs(elevation) * 2.0 / gPI);

    return texture(skyviewImage, vec2(u, v)).rgb;
}

void main()
{
    const vec3 planetRelativePosition = FindPlanetRelativePosition(CameraPosition_Fov.xyz);
    const float cameraHeight = length(planetRelativePosition);
    const float altitude = GetSunAltitude(Time);
    const vec3 sunDirection = normalize(vec3(cos(altitude), sin(altitude), .0f));
    const vec2 centeredUV = inUV - .5f;
    const vec2 rayAngles = FishEyeRayAngles(centeredUV, CameraForward_AspectRatio.w);

    vec3 color;
    // https://github.com/fgarlin/skytracer/blob/master/src/camera.cxx
    if (length(centeredUV) > 0.5f + 1e-3f)
    {
        color = vec3(0.0);
    }
    else if (cameraHeight > gAtmosphereRadius || !UseSkyview)
    {
        // directly raymarch when skyview disabled/unavailable
        float sinTheta = sin(rayAngles.x);
        float cosTheta = cos(rayAngles.x);
        float cosPhi = cos(rayAngles.y);
        float sinPhi = sin(rayAngles.y);

        const vec3 rayDirection = normalize(vec3(sinTheta * cosPhi, cosTheta, sinTheta * sinPhi));
        color = SimpleToneMap(FindSkyScattering(transmittanceImage, multipleScatteringImage
                              , planetRelativePosition, rayDirection, sunDirection, spectral));
    }
    else
    color = SimpleToneMap(SampleSkyviewLUT(rayAngles.x, rayAngles.y));

    outColor = vec4(color, 1.f);
}