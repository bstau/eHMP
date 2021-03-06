class TileSorting < AccessBrowserV2
  include Singleton
  def initialize
    super
    # In Support of Background, add user defined VistA Health Summary screen
    add_action(CucumberLabel.new("SelectSummaryView"), ClickAction.new, AccessHtmlElement.new(:xpath, "//*[@id='applet-1']/div/div[2]/ul/li[1]/div[2]"))
    add_verify(CucumberLabel.new("VistA Health Summaries"), VerifyContainsText.new, AccessHtmlElement.new(:xpath, "//*[@id='screenName']"))
    add_action(CucumberLabel.new("Workspace Manager Button"), ClickAction.new, AccessHtmlElement.new(:xpath, ".//*[@id='workspace-manager-button']"))
    add_action(CucumberLabel.new("Add New WorkSheet"), ClickAction.new, AccessHtmlElement.new(:id, "addScreen"))
    add_action(CucumberLabel.new("Default Title"), ClickAction.new, AccessHtmlElement.new(:xpath, ".//*[@id='mainOverlayRegion']/div/div/div[3]/div/div/div[1]/div/p/span"))
    add_action(CucumberLabel.new("Title"), SendKeysAndEnterAction.new, AccessHtmlElement.new(:id, "screen-title"))
    add_action(CucumberLabel.new("Description"), SendKeysAndEnterAction.new, AccessHtmlElement.new(:id, "screen-description"))
    add_action(CucumberLabel.new("AddLoadButton"), ClickAction.new, AccessHtmlElement.new(:css, ".btn.btn-primary.addLoadButton"))
    add_action(CucumberLabel.new("VistA Health Summaries Summary"), ClickAction.new, AccessHtmlElement.new(:xpath, "//*[@id='applet-1']/div/div[2]/p"))
    add_verify(CucumberLabel.new("newScreenTitle"), VerifyContainsText.new, AccessHtmlElement.new(:xpath, "//*[@id='applet-1']/div/div/div[1]/span[3]/span"))
  end
end

When(/^the user creates a new workspace titled "(.*?)" with the description "(.*?)"$/) do |arg1, arg2|
  driver = TestSupport.driver
  driver.find_element(:xpath, "//*[@id='user-defined-workspace-1']/div/div[1]/div[2]/input").clear
  driver.find_element(:xpath, "//*[@id='user-defined-workspace-1']/div/div[1]/div[2]/input").send_keys arg1
  driver.find_element(:xpath, "//*[@id='user-defined-workspace-1']/div/div[1]/div[3]/input").send_keys arg2 
end

When(/^sets "(.*?)" as the default workspace$/) do |arg1|
  driver = TestSupport.driver
  driver.find_element(:xpath, "//*[@id='user-defined-workspace-1']/div/div[2]/div[4]/i").click
  sleep(1)
  driver.find_element(:xpath, "//*[@id='user-defined-workspace-1']/div/div[3]/ul/li[1]").click
end

When(/^the user drags and drops the Conditions thumbnail right by (\d+) and down by (\d+)$/) do |arg1, arg2|
  driver = TestSupport.driver
  TestSupport.wait_for_page_loaded
  #wait_until_loaded("VistA Health Summaries Summary")
  applet_preview = driver.find_element(:xpath, "//*[@id='applets-carousel']/div[1]/div[2]/div[1]/div[5]")
  perform_drag(applet_preview, arg1, arg2)
end

When(/^user clicks "(.*?)" on the workspace editor of Conditions$/) do |arg1|
  driver = TestSupport.driver
  driver.find_element(:xpath, "//*[@id='applet-1']/div/div[2]/ul/li[1]/div[1]").click
end

When(/^user clicks "(.*?)" on the workspace editor of Labs$/) do |arg1|
  driver = TestSupport.driver
  driver.find_element(:xpath, "//*[@id='applet-2']/div/div[2]/ul/li[1]/div[1]").click
end

When(/^the user drags and drops the Labs thumbnail right by (\d+) and down by (\d+)$/) do |arg1, arg2|
  driver = TestSupport.driver
  applet_preview = driver.find_element(:xpath, "//*[@id='applets-carousel']/div[1]/div[2]/div[1]/div[9]")
  perform_drag(applet_preview, arg1, arg2)
end

When(/^the user drags and drops the Vitals thumbnail right by (\d+) and down by (\d+)$/) do |arg1, arg2|
  driver = TestSupport.driver
  sleep(3)
  driver.find_element(:xpath, "//*[@id='applets-carousel']/div[1]/div[3]/a/span").click
  sleep(3)
  applet_preview = driver.find_element(:xpath, "//*[@id='applets-carousel']/div[1]/div[2]/div[2]/div[4]")
  perform_drag(applet_preview, arg1, arg2)
end

When(/^user clicks "(.*?)" on the workspace editor of Vitals$/) do |arg1|
  driver = TestSupport.driver
  driver.find_element(:xpath, "//*[@id='applet-4']/div/div[2]/ul/li[1]/div[1]").click
end

When(/^the user drags and drops the Meds thumbnail right by (\d+) and down by (\d+)$/) do |arg1, arg2|
  driver = TestSupport.driver
  applet_preview = driver.find_element(:xpath, "//*[@id='applets-carousel']/div[1]/div[2]/div[1]/div[10]")
  perform_drag(applet_preview, arg1, arg2)
end

When(/^user clicks "(.*?)" on the workspace editor of Meds$/) do |arg1|
  driver = TestSupport.driver
  driver.find_element(:xpath, "//*[@id='applet-3']/div/div[2]/ul/li[1]/div[1]").click
  sleep(3)
end

When(/^user clicks "(.*?)" on the workspace editor$/) do |arg1|
  driver = TestSupport.driver
  driver.find_element(:xpath, "//*[@id='exitEditing']").click
end

When(/^the user is viewing the workspace titled "(.*?)"$/) do |arg1|
  driver = TestSupport.driver
  text = driver.find_element(:xpath, "//*[@id='screenName']").text
  if text.include? "test"
  else fail("the test failed")  
  end
end

Given(/^the user is viewing the applet titled "(.*?)"$/) do |arg1|
  driver = TestSupport.driver
  text = driver.find_element(:xpath, "//*[@id='applet-1']/div/div/div[1]/span[3]/span").text
  puts text
end

Given(/^the list of conditions in the applet is as follows$/) do |table|
  # table is a Cucumber::Ast::Table
  pending # express the regexp above with the code you wish you had
end
