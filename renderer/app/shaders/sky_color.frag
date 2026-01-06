#version 450

layout (location = 0) in vec2 inUV;

layout (binding = 1) uniform sampler2D depthBuffer;

layout (location = 0) out vec4 outColour;

void main()
{
    const float depth = texelFetch(depthBuffer, ivec2(inUV * textureSize(depthBuffer, 0)), 0).r;
    if (depth >= 1.f)
    {
        const vec3 debugSky = vec3(1.f, .0f, .0f);
        outColour = vec4(debugSky, 1.f);
    }
    else discard;
}