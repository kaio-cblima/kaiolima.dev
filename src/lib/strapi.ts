interface StrapiFetchApiOptions {
    wrappedByKey?: string
    wrappedByList?: boolean
}

type WithSeo<T> = T & {
    attributes: {
        seo: {
            id: number
            metaTitle: string
            metaDescription: string
            keywords: string
            canonicalURL: string
        }
    }
}

interface Article {
    id: number
    attributes: {
        title: string
        createdAt: string
        updatedAt: string
        publishedAt: string
        locale: string
        description: string
        slug: string
        content: string
    }
}

export async function fetchApi<T>(path: string, options: StrapiFetchApiOptions = {}) {
    const url = new URL(`${import.meta.env.STRAPI_URL}${path}`)
    const res = await fetch(url, {
        headers: {
            "Authorization": `bearer ${import.meta.env.STRAPI_TOKEN}`
        }
    })
    let data = await res.json()

    if(options.wrappedByKey) data = data[options.wrappedByKey]
    if(options.wrappedByList) data = data[0]

    return data as T
}

export const fetchArticle = (id: number) => fetchApi<WithSeo<Article>>("/api/articles/" + id + "?populate=*", { wrappedByKey: "data" })
export const fetchArticles = () => fetchApi<Article[]>("/api/articles", { wrappedByKey: "data" })