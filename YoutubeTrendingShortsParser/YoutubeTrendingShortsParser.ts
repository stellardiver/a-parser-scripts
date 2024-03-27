import { BaseParser } from 'a-parser-types';
import { JSDOM } from 'jsdom';

const ytServiceApiKey = "eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJodHRwOi8vbG9jYWxob3N0OjgwODAvYWRkX3l0X3VzZXJzIiwiaXNzIjoiaHR0cDovL2xvY2FsaG9zdDo4MDgwLyIsInVzZXJuYW1lIjoiYWRtaW4iLCJleHAiOjE3MDA3MjE1NjN9.WjeOp-ALUOJGQpk28jUtFWU6cPTG-Afba9VjnNC5M7faSsVrH8YRsel6F2QL9nPvIOpV09ldBCiTKjOV5GaZzg";

const youtubeTrendingVideosUrls: readonly string[] = [
    'https://www.youtube.com/feed/trending',
    'https://www.youtube.com/feed/trending?bp=4gINGgt5dG1hX2NoYXJ0cw%3D%3D',
    'https://www.youtube.com/feed/trending?bp=4gIcGhpnYW1pbmdfY29ycHVzX21vc3RfcG9wdWxhcg%3D%3D',
    'https://www.youtube.com/feed/trending?bp=4gIKGgh0cmFpbGVycw%3D%3D'
];

const reelVideos: {
    video_id: string,
    title: string,
    description: string,
    channel_name: string,
    channel_url: string,
    published_time: string,
    tab_title: string,
    view_count: string,
    length: string,
    thumbnail_url: string,
    video_url: string,
    last_updated: number,
    proxy_geo: string
}[] = [];

export class JS_YoutubeTrendingShortsParser extends BaseParser {
 
    static defaultConf: typeof BaseParser.defaultConf = {
        version: '0.0.88',
        results: {
            flat: [
                ['json_test_string', 'Results count'],
            ],
            arrays: {
                serp: ['Serp', [
                    ['video_id', 'Youtube Video ID'],
                    ['title', 'Youtube Video Title'],
                    ['description', 'Youtube Video Description'],
                    ['channel_name', 'Youtube Video Channel Name'],
                    ['channel_url', 'Youtube Video Channel URL'],
                    ['published_time', 'Youtube Video Published Time'],
                    ['tab_title', 'Youtube Video Tab Title'],
                    ['view_count', 'Youtube Video View Count'],
                    ['length', 'Youtube Video Length'],
                    ['thumbnail_url', 'Youtube Video Thumbnail URL'],
                    ['video_url', "Youtube Video URL"],
                    ['last_updated', "Youtube Video Info Last Updated"],
                    ['proxy_geo', "Proxy Geo"]
                ]]
            }
        },
        results_format: "$query",
        max_size: 2 * 1024 * 1024,
        parsecodes: {
            200: 1,
        }
    };
    
    static editableConf: typeof BaseParser.editableConf = [
];

    async parse(set, results) {

        this.logger.put("Start scraping query: " + set.query);

        for (let i = 0; i < youtubeTrendingVideosUrls.length; i++) {

            const { success, data } = await this.request("GET", youtubeTrendingVideosUrls[i], {}, {
                decode: "auto-html",
                headers: {
                    accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                    "Cookie": "CONSENT:YES+1;",
                    //"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
                }
            });
    
            results.success = success;
    
            const dom = new JSDOM(data.toString());
            const scriptElements = dom.window.document.querySelectorAll('script');
    
            this.logger.put("Script elements length: " + scriptElements.length);
            this.logger.put("Script elements: " + scriptElements[34].textContent);
    
            if (scriptElements) {
                const matches = scriptElements[34].textContent.match(/ytInitialData\s*=\s*({[^;]*})/);
            
                if (matches && matches[1]) {
    
                    this.logger.put("JSON string: " + matches[1]);

                    try {

                        const rootJson = JSON.parse(matches[1]);
    
                        let videoItems = rootJson.contents.twoColumnBrowseResultsRenderer.tabs[i].tabRenderer
                                            .content?.sectionListRenderer.contents[0].itemSectionRenderer
                                            .contents[0].shelfRenderer?.content?.expandedShelfContentsRenderer?.items ?? undefined;
                        let tabTitle = rootJson.contents.twoColumnBrowseResultsRenderer.tabs[i].tabRenderer.title;
                
                        if (videoItems != undefined) {
        
                            this.logger.put("Videos found " + videoItems.length);
        
                            for (let p = 0; p < videoItems.length; p++) {
    
                              const videoItem = videoItems[p].videoRenderer;
                              const reelWatchEndpoint = videoItem.navigationEndpoint.reelWatchEndpoint;
    
                              if (reelWatchEndpoint != undefined) {
    
                                const videoId = videoItem.videoId;
                                const title = videoItem.title.runs[0].text;
                                const description = videoItem.descriptionSnippet?.runs[0].text ?? "";
                                const channelName = videoItem.longBylineText.runs[0].text;
                                const channelUrl = "https://www.youtube.com" + videoItem.longBylineText.runs[0].navigationEndpoint.browseEndpoint?.canonicalBaseUrl;
                                const publishedTime = videoItem.publishedTimeText.simpleText;
                                const viewCount = videoItem.viewCountText.simpleText;
                                const length = videoItem.lengthText.simpleText;
                                const thumbnailUrl = videoItem.thumbnail.thumbnails[0].url;
                                const lastUpdated = Date.now();
                                const proxyGeo = set.query.split("_")[0].toUpperCase();
        
                                const videoUrl = "https://www.youtube.com/shorts/" + videoId;
        
                                const video = {
                                    video_id: videoId,
                                    title: title,
                                    description: description,
                                    channel_name: channelName,
                                    channel_url: channelUrl,
                                    published_time: publishedTime,
                                    tab_title: tabTitle,
                                    view_count: viewCount,
                                    length: length,
                                    thumbnail_url: thumbnailUrl,
                                    video_url: videoUrl,
                                    last_updated: lastUpdated,
                                    proxy_geo: proxyGeo
                                };
    
                                this.logger.put("Video with reel endpoint: " + JSON.stringify(video));
                                reelVideos.push(video);
                              }   
                            }
                        }

                    } catch (error) {
                        this.logger.put("JSON parse error: " + error);
                    }
                    
                } else {
                    this.logger.put("JSON data not found in the script content.");
                }
            } else {
                this.logger.put('Script element not found in the HTML.');
            }
        }

        this.logger.put("JSON.stringify(reelVideos): " + JSON.stringify(reelVideos));

        const reelVideosToDb = await this.request("POST", "https://yt-service.space/update_yt_videos", {}, {
            body: JSON.stringify(reelVideos),
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + ytServiceApiKey
            }
        });

        this.logger.put("Reel videos to db: " + JSON.stringify(reelVideosToDb));

        if (reelVideosToDb.success) {
            this.logger.put("Reel videos to db: success");
        }

        if (reelVideosToDb.error) {
            this.logger.put("Reel videos to db: error - " + reelVideosToDb.error);
        }

        if (results.serp) {

            for (let item of reelVideos) {
                
                results.serp.push(
                    item.video_id,
                    item.title,
                    item.description,
                    item.channel_name,
                    item.channel_url,
                    item.published_time,
                    item.tab_title,
                    item.view_count,
                    item.length,
                    item.thumbnail_url,
                    item.video_url,
                    item.last_updated,
                    item.proxy_geo
                )
            }

            this.logger.put("Total found " + results.total_count + " items")
        }

        return results;
    }
}