
import React, { useEffect } from 'react';
import { supabase } from '../lib/supabase';

const MetaTags: React.FC = () => {
    useEffect(() => {
        const updateMetaTags = async () => {
            try {
                const { data } = await supabase.from('system_configs').select('*');
                if (data) {
                    const find = (key: string) => data.find(c => c.key === key)?.value;

                    const title = find('seo_title');
                    const description = find('seo_description');
                    const keywords = find('seo_keywords');
                    const ogImage = find('seo_og_image');
                    const favicon = find('seo_favicon_url');

                    if (title) document.title = title;

                    if (description) {
                        let metaDesc = document.querySelector('meta[name="description"]');
                        if (!metaDesc) {
                            metaDesc = document.createElement('meta');
                            metaDesc.setAttribute('name', 'description');
                            document.head.appendChild(metaDesc);
                        }
                        metaDesc.setAttribute('content', description);

                        // OG Description
                        let ogDesc = document.querySelector('meta[property="og:description"]');
                        if (!ogDesc) {
                            ogDesc = document.createElement('meta');
                            ogDesc.setAttribute('property', 'og:description');
                            document.head.appendChild(ogDesc);
                        }
                        ogDesc.setAttribute('content', description);
                    }

                    if (keywords) {
                        let metaKey = document.querySelector('meta[name="keywords"]');
                        if (!metaKey) {
                            metaKey = document.createElement('meta');
                            metaKey.setAttribute('name', 'keywords');
                            document.head.appendChild(metaKey);
                        }
                        metaKey.setAttribute('content', keywords);
                    }

                    if (ogImage) {
                        let metaOgImg = document.querySelector('meta[property="og:image"]');
                        if (!metaOgImg) {
                            metaOgImg = document.createElement('meta');
                            metaOgImg.setAttribute('property', 'og:image');
                            document.head.appendChild(metaOgImg);
                        }
                        metaOgImg.setAttribute('content', ogImage);
                    }

                    if (favicon) {
                        let linkFav = document.querySelector('link[rel="icon"]');
                        if (!linkFav) {
                            linkFav = document.createElement('link');
                            linkFav.setAttribute('rel', 'icon');
                            document.head.appendChild(linkFav);
                        }
                        linkFav.setAttribute('href', favicon);
                    }

                    // OG Title
                    if (title) {
                        let ogTitle = document.querySelector('meta[property="og:title"]');
                        if (!ogTitle) {
                            ogTitle = document.createElement('meta');
                            ogTitle.setAttribute('property', 'og:title');
                            document.head.appendChild(ogTitle);
                        }
                        ogTitle.setAttribute('content', title);
                    }
                }
            } catch (err) {
                console.error('Erro ao atualizar MetaTags:', err);
            }
        };

        updateMetaTags();
    }, []);

    return null;
};

export default MetaTags;
