#ifndef VULKANRESEARCH_FILESAVER_H
#define VULKANRESEARCH_FILESAVER_H
#include <filesystem>

void SaveEXRFile(void const* data, int width, int height, std::filesystem::path const& outputPath);

void SavePNGFile(void const* data, int width, int height, std::filesystem::path const& outputPath);

#endif //VULKANRESEARCH_FILESAVER_H
