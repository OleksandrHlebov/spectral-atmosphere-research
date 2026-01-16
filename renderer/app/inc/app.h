#ifndef APP_H
#define APP_H
#include <memory>

#include "buffer.h"
#include "context.h"
#include "camera.h"
#include "descriptor_set.h"
#include "VkBootstrap.h"

class TimingQueryPool;

namespace vkc
{
	class CommandPool;
	class CommandBuffer;
	class DescriptorPool;
	class DescriptorSetLayout;
	class ImageView;
	class Image;
	class Pipeline;
	class PipelineLayout;
}

class App final
{
public:
	template<typename T>
	using uptr = std::unique_ptr<T>;
	App(int width, int height);
	~App();

	App(App&&)                 = delete;
	App(App const&)            = delete;
	App& operator=(App const&) = delete;
	App& operator=(App&&)      = delete;

	void Run();

	static void KeyCallback(GLFWwindow* window, int key, int, int action, int)
	{
		auto app = static_cast<App*>(glfwGetWindowUserPointer(window));

		if (key == GLFW_KEY_F1 && action == GLFW_PRESS)
		{
			app->m_UseSkyview = !app->m_UseSkyview;
		}
	}

private:
	std::tuple<vkc::Pipeline, vkc::Image, vkc::ImageView> GenerateTempImageAndPipeline(bool hdr);
	void                                                  RenderSkyToImage
	(vkc::CommandBuffer& commandBuffer, vkc::Image& stagingImage, vkc::ImageView& stagingImageView, vkc::Pipeline& pipeline);

	void RenderAtmosphereToAFile(bool hdr = false);
	void ProfilePipelinesAndDump();
	void RenderAllConfigsToFiles();

	void CreateWindow(int width, int height);
	void CreateInstance();
	void CreateSurface();
	void CreateDevice();
	void CreateSwapchain();
	void CreateSyncObjects();
	void CreateDescriptorPool();
	void CreateDescriptorSets();
	void CreateVertexBuffer();
	void CreateGraphicsPipeline();
	void CreateCmdPool();
	void CreateDescriptorSetLayouts();
	void CreateResources();
	void CreateDepth();
	void GenerateTransmittanceLUT(vkc::CommandBuffer& commandBuffer);
	void GenerateMultScatteringLUT(vkc::CommandBuffer& commandBuffer);
	void GenerateSkyviewLUT(vkc::CommandBuffer& commandBuffer);
	void RecreateSwapchain();
	void RecordCommandBuffer(vkc::CommandBuffer& commandBuffer, size_t imageIndex);
	void Submit(vkc::CommandBuffer& commandBuffer) const;
	void Present(uint32_t imageIndex);
	void End();

	uptr<Camera> m_Camera;
	vkc::Context m_Context{};

	uptr<vkc::DescriptorSetLayout> m_FrameDescSetLayout{};
	uptr<vkc::DescriptorPool>      m_DescPool{};

	uptr<vkc::PipelineLayout> m_PipelineLayout;
	uptr<vkc::PipelineLayout> m_EmptyPipelineLayout;

	uptr<vkc::Pipeline> m_Pipeline{};
	uptr<vkc::Pipeline> m_TransmittancePipeline{};
	uptr<vkc::Pipeline> m_MultipleScatteringPipeline{};
	uptr<vkc::Pipeline> m_SkyviewPipeline{};
	uptr<vkc::Pipeline> m_SkyRenderPipeline{};

	uptr<vkc::Image>     m_SkyviewImage{};
	uptr<vkc::ImageView> m_SkyviewImageView{};

	uptr<vkc::Image>     m_MultScatteringImage{};
	uptr<vkc::ImageView> m_MultScatteringImageView{};

	uptr<vkc::Image>     m_TransmittanceImage{};
	uptr<vkc::ImageView> m_TransmittanceImageView{};

	VkFormat             m_DepthFormat{};
	uptr<vkc::Image>     m_DepthImage{};
	uptr<vkc::ImageView> m_DepthImageView{};
	VkSampler            m_Sampler{};

	std::vector<vkc::Image>     m_SwapchainImages;
	std::vector<vkc::ImageView> m_SwapchainImageViews;

	uptr<vkc::CommandPool> m_CommandPool{};

	uptr<vkc::Buffer>        m_VertexBuffer{};
	std::vector<vkc::Buffer> m_MVPUBOs{};

	std::vector<vkc::DescriptorSet> m_FrameDescriptorSets{};

	std::vector<VkSemaphore> m_ImageAvailableSemaphores{};
	std::vector<VkSemaphore> m_RenderFinishedSemaphores{};
	std::vector<VkFence>     m_InFlightFences{};

	uptr<TimingQueryPool> m_QueryPool;

	uint32_t m_FramesInFlight{};
	uint32_t m_CurrentFrame{};

	bool       m_UseSkyview{ false };
	bool const m_Spectral{ false }; // requires changes made to pipelines, not adapted for runtime toggle
};

#endif //APP_H
