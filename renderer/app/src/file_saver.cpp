#include "file_saver.h"
#include <array>
#include <iostream>
#pragma warning(push)
#pragma warning(disable : 4702 4706 4267 4244 4245 4305 4800)
#define TINYEXR_IMPLEMENTATION
#include "tinyexr.h"
#pragma warning(pop)
#define STB_IMAGE_WRITE_IMPLEMENTATION
#include "stb_image_write.h"

void SaveEXRFile(void const* data, int width, int height, std::filesystem::path const& outputPath)
{
	auto      pixelData = static_cast<uint16_t const*>(data); // received data is 16 bits, RGBA16 format
	EXRHeader exrHeader;
	InitEXRHeader(&exrHeader);

	EXRImage exrImage;
	InitEXRImage(&exrImage);

	static int constexpr  channelCount{ 4 };
	std::vector<uint16_t> images[channelCount]{};
	for (int image{}; image < channelCount; ++image)
		images[image].resize(width * height);

	for (int pixel{}; pixel < width * height; ++pixel)
	{
		for (int channel{}; channel < channelCount; ++channel)
			images[channel][pixel] = pixelData[channelCount * pixel + channel];
	}

	uint16_t* imagePtr[channelCount];
	for (int image{}; image < channelCount; ++image)
		imagePtr[image] = &images[image][0];

	exrImage.images            = reinterpret_cast<unsigned char**>(imagePtr);
	exrImage.num_channels      = channelCount;
	exrImage.width             = width;
	exrImage.height            = height;
	exrHeader.num_channels     = channelCount;
	exrHeader.channels         = static_cast<EXRChannelInfo*>(malloc(sizeof(EXRChannelInfo) * exrHeader.num_channels));
	exrHeader.compression_type = TINYEXR_COMPRESSIONTYPE_ZIP;

	static std::array constexpr channelNames{ "R", "G", "B", "A" };

	for (char channel{}; channel < channelCount; ++channel)
		strcpy_s(exrHeader.channels[channel].name, channelNames[channel]);

	exrHeader.pixel_types           = static_cast<int*>(malloc(sizeof(int) * exrHeader.num_channels));
	exrHeader.requested_pixel_types = static_cast<int*>(malloc(sizeof(int) * exrHeader.num_channels));
	for (int channel{}; channel < channelCount; ++channel)
	{
		exrHeader.pixel_types[channel]           = TINYEXR_PIXELTYPE_HALF;
		exrHeader.requested_pixel_types[channel] = TINYEXR_PIXELTYPE_HALF;
	}

	char const* error = nullptr;

	int const ret = SaveEXRImageToFile(&exrImage, &exrHeader, outputPath.string().c_str(), &error);
	if (ret != TINYEXR_SUCCESS)
	{
		std::cerr << error << std::endl;
		FreeEXRErrorMessage(error); // free's buffer for an error message
		return;
	}
	free(exrHeader.channels);
	free(exrHeader.pixel_types);
	free(exrHeader.requested_pixel_types);
}

void SavePNGFile(void const* data, int width, int height, std::filesystem::path const& outputPath)
{
	stbi_write_png(outputPath.string().c_str(), width, height, 4, data, width * 4);
}
