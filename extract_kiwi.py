from keybert import KeyBERT
from kiwipiepy import Kiwi
from transformers import BertModel


text="""
3인 가족 엄마 아빠와 책을 읽고있는 5살짜리 앉아있는 남자아이
어질러진 거실  
"""
model = BertModel.from_pretrained('skt/kobert-base-v1')
kw_model = KeyBERT(model)
keywords = kw_model.extract_keywords(text, keyphrase_ngram_range=(1, 1), stop_words=None, top_n=10)
keywords

kiwi = Kiwi()
print(kiwi.analyze(text), end='\n')